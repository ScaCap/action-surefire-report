package utils

import "testing"
import "github.com/stretchr/testify/assert"

func TestFailing(t *testing.T) {
	assert.Equal(t, "1", "2")
}
