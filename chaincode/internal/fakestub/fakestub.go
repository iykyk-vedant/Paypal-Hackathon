package fakestub

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"sort"
	"strings"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-protos-go/ledger/queryresult"
	pbMsp "github.com/hyperledger/fabric-protos-go/msp"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// FakeStub implements an in-memory ledger stub for testing
type FakeStub struct {
	TxID               string
	TxTimestamp        *timestamppb.Timestamp
	PublicState        map[string][]byte
	PrivateState       map[string]map[string][]byte // collection -> key -> value
	ValidationParams   map[string][]byte            // key -> validation parameter (SBE)
	Transient          map[string][]byte
	CallerMSP          string
	CallerCertSerial   string
	WrittenCollections []string
	PrivateWriteLog    []PrivateWriteEntry
}

type PrivateWriteEntry struct {
	Collection string
	Key        string
	Value      []byte
}

func NewFakeStub() *FakeStub {
	return &FakeStub{
		TxID:             "tx-mock-001",
		TxTimestamp:      timestamppb.New(time.Unix(1700000000, 0)),
		PublicState:      make(map[string][]byte),
		PrivateState:     make(map[string]map[string][]byte),
		ValidationParams: make(map[string][]byte),
		Transient:        make(map[string][]byte),
		CallerMSP:        "RegAMSP",
		CallerCertSerial: "cert-serial-mock-1",
	}
}

func (f *FakeStub) GetTxID() string {
	return f.TxID
}

func (f *FakeStub) GetTxTimestamp() (*timestamppb.Timestamp, error) {
	return f.TxTimestamp, nil
}

func (f *FakeStub) SetTxTimestamp(unixSec int64) {
	f.TxTimestamp = timestamppb.New(time.Unix(unixSec, 0))
}

func (f *FakeStub) GetState(key string) ([]byte, error) {
	val, ok := f.PublicState[key]
	if !ok {
		return nil, nil
	}
	return val, nil
}

func (f *FakeStub) PutState(key string, value []byte) error {
	f.PublicState[key] = value
	return nil
}

func (f *FakeStub) DelState(key string) error {
	delete(f.PublicState, key)
	return nil
}

func (f *FakeStub) GetPrivateData(collection, key string) ([]byte, error) {
	coll, ok := f.PrivateState[collection]
	if !ok {
		return nil, nil
	}
	val, ok := coll[key]
	if !ok {
		return nil, nil
	}
	return val, nil
}

func (f *FakeStub) PutPrivateData(collection, key string, value []byte) error {
	if f.PrivateState[collection] == nil {
		f.PrivateState[collection] = make(map[string][]byte)
	}
	f.PrivateState[collection][key] = value

	// Track written collections
	found := false
	for _, c := range f.WrittenCollections {
		if c == collection {
			found = true
			break
		}
	}
	if !found {
		f.WrittenCollections = append(f.WrittenCollections, collection)
	}
	f.PrivateWriteLog = append(f.PrivateWriteLog, PrivateWriteEntry{
		Collection: collection,
		Key:        key,
		Value:      value,
	})
	return nil
}

func (f *FakeStub) DelPrivateData(collection, key string) error {
	if coll, ok := f.PrivateState[collection]; ok {
		delete(coll, key)
	}
	return nil
}

func (f *FakeStub) GetPrivateDataHash(collection, key string) ([]byte, error) {
	coll, ok := f.PrivateState[collection]
	if !ok {
		return nil, nil
	}
	val, ok := coll[key]
	if !ok || len(val) == 0 {
		return nil, nil
	}
	h := sha256.Sum256(val)
	return h[:], nil
}

func (f *FakeStub) SetStateValidationParameter(key string, ep []byte) error {
	f.ValidationParams[key] = ep
	return nil
}

func (f *FakeStub) GetStateValidationParameter(key string) ([]byte, error) {
	return f.ValidationParams[key], nil
}

func (f *FakeStub) GetTransient() (map[string][]byte, error) {
	return f.Transient, nil
}

func generateMockCertPEM(mspID string) []byte {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil
	}
	template := x509.Certificate{
		SerialNumber: big.NewInt(1001),
		Subject: pkix.Name{
			CommonName:   "Admin@" + mspID,
			Organization: []string{mspID},
		},
		NotBefore: time.Unix(1700000000, 0).Add(-1 * time.Hour),
		NotAfter:  time.Unix(1700000000, 0).Add(24 * time.Hour),
	}
	der, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		return nil
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

func (f *FakeStub) GetCreator() ([]byte, error) {
	certPEM := generateMockCertPEM(f.CallerMSP)
	sID := &pbMsp.SerializedIdentity{
		Mspid:   f.CallerMSP,
		IdBytes: certPEM,
	}
	return proto.Marshal(sID)
}

// In-memory range iterator
type FakeStateQueryIterator struct {
	items []*queryresult.KV
	index int
}

func (it *FakeStateQueryIterator) HasNext() bool {
	return it.index < len(it.items)
}

func (it *FakeStateQueryIterator) Next() (*queryresult.KV, error) {
	if !it.HasNext() {
		return nil, nil
	}
	item := it.items[it.index]
	it.index++
	return item, nil
}

func (it *FakeStateQueryIterator) Close() error {
	return nil
}

func (f *FakeStub) GetStateByRange(startKey, endKey string) (shim.StateQueryIteratorInterface, error) {
	var keys []string
	for k := range f.PublicState {
		if (startKey == "" || k >= startKey) && (endKey == "" || k <= endKey) {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)
	var items []*queryresult.KV
	for _, k := range keys {
		items = append(items, &queryresult.KV{
			Key:   k,
			Value: f.PublicState[k],
		})
	}
	return &FakeStateQueryIterator{items: items, index: 0}, nil
}

// In-memory history iterator
type FakeHistoryQueryIterator struct {
	items []*queryresult.KeyModification
	index int
}

func (it *FakeHistoryQueryIterator) HasNext() bool {
	return it.index < len(it.items)
}

func (it *FakeHistoryQueryIterator) Next() (*queryresult.KeyModification, error) {
	if !it.HasNext() {
		return nil, nil
	}
	item := it.items[it.index]
	it.index++
	return item, nil
}

func (it *FakeHistoryQueryIterator) Close() error {
	return nil
}

func (f *FakeStub) GetHistoryForKey(key string) (shim.HistoryQueryIteratorInterface, error) {
	val, ok := f.PublicState[key]
	var items []*queryresult.KeyModification
	if ok {
		items = append(items, &queryresult.KeyModification{
			TxId:      f.TxID,
			Value:     val,
			Timestamp: f.TxTimestamp,
			IsDelete:  false,
		})
	}
	return &FakeHistoryQueryIterator{items: items, index: 0}, nil
}

// FakeClientIdentity implements ClientIdentityInterface
type FakeClientIdentity struct {
	MSP string
	ID  string
}

func (c *FakeClientIdentity) GetMSPID() (string, error) {
	return c.MSP, nil
}

func (c *FakeClientIdentity) GetID() (string, error) {
	if c.ID != "" {
		return c.ID, nil
	}
	return fmt.Sprintf("x509::CN=User1,OU=client,O=%s::CN=ca.%s", c.MSP, strings.ToLower(c.MSP)), nil
}

// Ensure interface assertions
var _ shim.ChaincodeStubInterface = (*MockChaincodeStub)(nil)

// MockChaincodeStub embeds all required stubs for ChaincodeStubInterface
type MockChaincodeStub struct {
	*FakeStub
	shim.ChaincodeStubInterface
}

func (m *MockChaincodeStub) GetTxID() string {
	return m.FakeStub.GetTxID()
}
func (m *MockChaincodeStub) GetTxTimestamp() (*timestamppb.Timestamp, error) {
	return m.FakeStub.GetTxTimestamp()
}
func (m *MockChaincodeStub) GetState(key string) ([]byte, error) {
	return m.FakeStub.GetState(key)
}
func (m *MockChaincodeStub) PutState(key string, value []byte) error {
	return m.FakeStub.PutState(key, value)
}
func (m *MockChaincodeStub) DelState(key string) error {
	return m.FakeStub.DelState(key)
}
func (m *MockChaincodeStub) GetPrivateData(collection, key string) ([]byte, error) {
	return m.FakeStub.GetPrivateData(collection, key)
}
func (m *MockChaincodeStub) PutPrivateData(collection, key string, value []byte) error {
	return m.FakeStub.PutPrivateData(collection, key, value)
}
func (m *MockChaincodeStub) DelPrivateData(collection, key string) error {
	return m.FakeStub.DelPrivateData(collection, key)
}
func (m *MockChaincodeStub) GetPrivateDataHash(collection, key string) ([]byte, error) {
	return m.FakeStub.GetPrivateDataHash(collection, key)
}
func (m *MockChaincodeStub) SetStateValidationParameter(key string, ep []byte) error {
	return m.FakeStub.SetStateValidationParameter(key, ep)
}
func (m *MockChaincodeStub) GetStateValidationParameter(key string) ([]byte, error) {
	return m.FakeStub.GetStateValidationParameter(key)
}
func (m *MockChaincodeStub) GetTransient() (map[string][]byte, error) {
	return m.FakeStub.GetTransient()
}
func (m *MockChaincodeStub) GetCreator() ([]byte, error) {
	return m.FakeStub.GetCreator()
}
func (m *MockChaincodeStub) GetStateByRange(startKey, endKey string) (shim.StateQueryIteratorInterface, error) {
	return m.FakeStub.GetStateByRange(startKey, endKey)
}
func (m *MockChaincodeStub) GetHistoryForKey(key string) (shim.HistoryQueryIteratorInterface, error) {
	return m.FakeStub.GetHistoryForKey(key)
}

func (m *MockChaincodeStub) CreateCompositeKey(objectType string, attributes []string) (string, error) {
	var buf bytes.Buffer
	buf.WriteString(objectType)
	for _, attr := range attributes {
		buf.WriteString("~")
		buf.WriteString(attr)
	}
	return buf.String(), nil
}
