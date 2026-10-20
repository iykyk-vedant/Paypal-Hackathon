package main

import (
	"log"
	"os"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func main() {
	cc, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("Error creating settlement chaincode: %v", err)
	}

	serverAddress := os.Getenv("CHAINCODE_SERVER_ADDRESS")
	ccid := os.Getenv("CORE_CHAINCODE_ID_NAME")
	if ccid == "" {
		ccid = os.Getenv("CHAINCODE_ID")
	}

	if serverAddress == "" {
		if err := cc.Start(); err != nil {
			log.Panicf("Error starting chaincode: %v", err)
		}
		return
	}

	server := &shim.ChaincodeServer{
		CCID:    ccid,
		Address: serverAddress,
		CC:      cc,
		TLSProps: shim.TLSProperties{
			Disabled: true,
		},
	}

	log.Printf("Starting chaincode server on %s with CCID %s", serverAddress, ccid)
	if err := server.Start(); err != nil {
		log.Panicf("Error starting chaincode server: %v", err)
	}
}
