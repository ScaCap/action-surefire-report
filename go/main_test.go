package main

import (
	"testing"
)

func TestFailing(t *testing.T) {
	t.Error("failing test")
}

func TestPassing(t *testing.T) {
	t.Log("passing test")
}
