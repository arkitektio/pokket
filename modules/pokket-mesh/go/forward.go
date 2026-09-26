package meshmobile

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"strconv"
	"sync"
	"time"
)

// dialFunc is how a forward reaches its upstream: the node's tailnet dialer
// in the app, a plain dialer in tests.
type dialFunc func(ctx context.Context, network, addr string) (net.Conn, error)

// forward is one loopback reverse proxy for one alias on the mesh.
//
// The app cannot hand React Native's fetch or WebSocket a proxy, so it is
// handed a different address instead: http://127.0.0.1:<port>, which lands
// here and is replayed to the alias over the tailnet. The upstream sees the
// request as the app would have sent it: the original Host header, and TLS
// (with the alias' own server name) when the alias is https. WebSocket
// upgrades pass through; httputil.ReverseProxy switches protocols itself.
type forward struct {
	key      string
	port     int
	listener net.Listener
	server   *http.Server

	mu   sync.Mutex
	dead bool
}

func forwardKey(host string, port int, useTLS bool) string {
	return fmt.Sprintf("%s|%d|%t", host, port, useTLS)
}

// newForward listens on 127.0.0.1, preferring preferPort so an alias keeps
// its address across a re-bind (iOS reclaims listening sockets of suspended
// apps; see Forward).
func newForward(host string, port int, useTLS bool, preferPort int, dial dialFunc) (*forward, error) {
	if host == "" {
		return nil, errors.New("forward needs a host")
	}
	upstreamPort := port
	if upstreamPort == 0 {
		upstreamPort = 80
		if useTLS {
			upstreamPort = 443
		}
	}
	upstream := net.JoinHostPort(host, strconv.Itoa(upstreamPort))
	// The Host header the app would have sent: no port when it had none.
	hostHeader := host
	if port != 0 {
		hostHeader = upstream
	}
	scheme := "http"
	if useTLS {
		scheme = "https"
	}

	var ln net.Listener
	var err error
	if preferPort > 0 {
		ln, err = net.Listen("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa(preferPort)))
	}
	if ln == nil {
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return nil, fmt.Errorf("forward listen: %w", err)
		}
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
			return dial(ctx, network, upstream)
		},
		TLSClientConfig:       &tls.Config{ServerName: host},
		ForceAttemptHTTP2:     false,
		MaxIdleConns:          16,
		IdleConnTimeout:       60 * time.Second,
		TLSHandshakeTimeout:   15 * time.Second,
		ResponseHeaderTimeout: 0, // subscriptions and long polls stay open
	}

	proxy := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.Out.URL.Scheme = scheme
			r.Out.URL.Host = upstream
			r.Out.Host = hostHeader
		},
		Transport:     transport,
		FlushInterval: -1, // stream (SSE, chunked uploads) instead of buffering
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, err error) {
			http.Error(w, "mesh: "+err.Error(), http.StatusBadGateway)
		},
	}

	f := &forward{
		key:      forwardKey(host, port, useTLS),
		port:     ln.Addr().(*net.TCPAddr).Port,
		listener: ln,
		server:   &http.Server{Handler: proxy, ReadHeaderTimeout: 30 * time.Second},
	}
	go func() {
		err := f.server.Serve(ln)
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			f.mu.Lock()
			f.dead = true
			f.mu.Unlock()
		}
	}()
	return f, nil
}

func (f *forward) alive() bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return !f.dead
}

func (f *forward) close() {
	f.mu.Lock()
	f.dead = true
	f.mu.Unlock()
	// The listener too: Close only knows it once Serve has started, and a
	// forward closed before then would otherwise keep its port.
	_ = f.server.Close()
	_ = f.listener.Close()
}

// Forward returns the loopback port that reaches host:port on mesh id's
// tailnet (port 0 means the scheme's default; useTLS means the alias is
// https). It is idempotent: the same alias always gets the same live
// forward, and a forward whose socket died (an iOS app coming back from
// suspension) is re-bound, on the same port when it is still free.
func Forward(id, host string, port int, useTLS bool) (int, error) {
	n := lookup(id)
	if n == nil {
		return 0, fmt.Errorf("mesh %q is not running", id)
	}
	key := forwardKey(host, port, useTLS)

	n.mu.Lock()
	defer n.mu.Unlock()
	preferPort := 0
	if existing := n.forwards[key]; existing != nil {
		if existing.alive() {
			return existing.port, nil
		}
		preferPort = existing.port
		existing.close()
		delete(n.forwards, key)
	}
	f, err := newForward(host, port, useTLS, preferPort, n.dial)
	if err != nil {
		return 0, err
	}
	n.forwards[key] = f
	return f.port, nil
}
