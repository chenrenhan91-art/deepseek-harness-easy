// Desktop pack entry for Windows: run bundled Node against launch.mjs.
// Paths are relative to the exe directory, never a developer checkout.
package main

import (
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	exe, err := os.Executable()
	if err != nil {
		os.Exit(1)
	}
	root := filepath.Join(filepath.Dir(exe), "runtime")
	node := filepath.Join(root, "node", "node.exe")
	script := filepath.Join(root, "launch.mjs")
	if _, err := os.Stat(node); err != nil {
		_ = os.WriteFile(filepath.Join(filepath.Dir(exe), "launcher-error.log"), []byte(err.Error()+"\n"), 0o644)
		os.Exit(1)
	}
	cmd := exec.Command(node, script)
	cmd.Dir = root
	cmd.Env = append(os.Environ(), "DSH_DESKTOP_RUNTIME="+root)
	if err := cmd.Run(); err != nil {
		_ = os.WriteFile(filepath.Join(filepath.Dir(exe), "launcher-error.log"), []byte(err.Error()+"\n"), 0o644)
		os.Exit(1)
	}
}
