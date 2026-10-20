package fakestub

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFakeStubBasics(t *testing.T) {
	stub := NewFakeStub()
	require.Equal(t, "tx-mock-001", stub.GetTxID())

	// Public state
	err := stub.PutState("KEY1", []byte("VAL1"))
	require.NoError(t, err)
	val, err := stub.GetState("KEY1")
	require.NoError(t, err)
	require.Equal(t, []byte("VAL1"), val)

	// Private state & hash
	err = stub.PutPrivateData("coll_1", "PRIV1", []byte("SECRET"))
	require.NoError(t, err)
	pval, err := stub.GetPrivateData("coll_1", "PRIV1")
	require.NoError(t, err)
	require.Equal(t, []byte("SECRET"), pval)

	hash, err := stub.GetPrivateDataHash("coll_1", "PRIV1")
	require.NoError(t, err)
	require.NotEmpty(t, hash)
	require.Equal(t, 32, len(hash))

	// Range query
	stub.PutState("A1", []byte("1"))
	stub.PutState("A2", []byte("2"))
	stub.PutState("B1", []byte("3"))
	it, err := stub.GetStateByRange("A", "B")
	require.NoError(t, err)
	count := 0
	for it.HasNext() {
		kv, err := it.Next()
		require.NoError(t, err)
		require.NotEmpty(t, kv.Key)
		count++
	}
	require.Equal(t, 2, count)
}
