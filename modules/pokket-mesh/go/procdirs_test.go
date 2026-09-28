package meshmobile

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
)

// The environment of an Android app process: no $HOME, no cache dir, and a
// temp dir that cannot be written. Afterwards both must be usable.
func TestEnsureProcessDirsAndroidLikeEnv(t *testing.T) {
	base := t.TempDir()
	t.Setenv("HOME", "")
	t.Setenv("XDG_CACHE_HOME", "")
	t.Setenv("TMPDIR", filepath.Join(base, "does-not-exist"))
	procDirsOnce = sync.Once{}

	if _, err := os.UserCacheDir(); err == nil {
		t.Fatal("precondition: expected no cache dir")
	}
	ensureProcessDirs(base)

	cache, err := os.UserCacheDir()
	if err != nil || cache != filepath.Join(base, "cache") {
		t.Fatalf("cache dir %q, %v", cache, err)
	}
	if !writableDir(os.TempDir()) || os.TempDir() != filepath.Join(base, "tmp") {
		t.Fatalf("temp dir %q not usable", os.TempDir())
	}
}

// Where the environment is fine it is left alone.
func TestEnsureProcessDirsKeepsWorkingEnv(t *testing.T) {
	base := t.TempDir()
	cache := t.TempDir()
	tmp := t.TempDir()
	t.Setenv("XDG_CACHE_HOME", cache)
	t.Setenv("TMPDIR", tmp)
	procDirsOnce = sync.Once{}
	ensureProcessDirs(base)
	if got, _ := os.UserCacheDir(); got != cache || os.TempDir() != tmp {
		t.Fatalf("changed a working env: cache %q tmp %q", got, os.TempDir())
	}
}
