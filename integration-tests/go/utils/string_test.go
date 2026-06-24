package utils

import "testing"

func TestFailing(t *testing.T) {
	if "1" != "2" {
		t.Error("expected 1 to equal 2")
	}
}
