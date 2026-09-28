package meshmobile

import (
	"os"
	"path/filepath"
	"sync"
)

var procDirsOnce sync.Once

// ensureProcessDirs gives the process the directories tsnet assumes a Unix
// process has. An Android app process has no $HOME or $XDG_CACHE_HOME, runs
// in "/", and cannot write the default temp dir (/data/local/tmp); tsnet's
// backend asks logpolicy for a logs directory on startup, finds none of
// those usable and panics ("no safe place found to store log state"),
// taking the whole app down. base is a directory the app owns (next to the
// meshes' state); cache and temp directories are made inside it only where
// the environment has none.
func ensureProcessDirs(base string) {
	procDirsOnce.Do(func() {
		if _, err := os.UserCacheDir(); err != nil {
			dir := filepath.Join(base, "cache")
			if os.MkdirAll(dir, 0o700) == nil {
				os.Setenv("XDG_CACHE_HOME", dir)
			}
		}
		if !writableDir(os.TempDir()) {
			dir := filepath.Join(base, "tmp")
			if os.MkdirAll(dir, 0o700) == nil {
				os.Setenv("TMPDIR", dir)
			}
		}
	})
}

func writableDir(dir string) bool {
	f, err := os.CreateTemp(dir, ".probe-*")
	if err != nil {
		return false
	}
	name := f.Name()
	f.Close()
	os.Remove(name)
	return true
}
