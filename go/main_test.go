package main

import (
	"testing"
)

func TestPassing(t *testing.T) {
	t.Log("passing test")
}

func TestFailing(t *testing.T) {
	t.Error("failing test")
}
