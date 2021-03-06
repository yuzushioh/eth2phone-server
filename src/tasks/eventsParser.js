const web3 = require('../utils/web3');
const log  = require('./../libs/log')(module);
const config = require("../config/app-config");
const CONTRACT_ADDRESS = config.get("ESCROW_CONTRACT_ADDRESS");
const { contractInstance: escrowContract } = require('./../services/EscrowContractService');
const axios = require('axios');


const pushEventToServer = (params) => {
    const host = config.get("ETH2PHONE_SERVER_HOST");
    const url = `${host}/api/v1/transfer-events/add`;
    params.parserApiKey = config.get("PARSER_API_KEY");
    return axios.post(url, params);    
}


const subscribeForPendingEvents = () => {
    log.debug("Subscribing for pending events.");	
    var filter = web3.eth.filter('pending');    

    filter.watch( async (error, txHash) => {
	try { 
	    const tx = await web3.eth.getTransactionPromise(txHash);
	    if (tx.to === CONTRACT_ADDRESS) {

		const DEPOSIT_SHA3 = '0xf340fa01';
		
		log.debug("GOT PENDING EVENT: ");		
		log.debug(tx);
		let eventName, transferStatus;
		if (tx.input.includes(DEPOSIT_SHA3)) {
		    // deposit event
		    eventName = 'deposit';
		    transferStatus = 'depositing';
		} else {
		    return null;
		}
		
		// get transit address from input data
		const gasPrice = tx.gasPrice.toNumber();
		const txStatus = 'pending';
		const txHash = tx.hash;

		const senderAddress = tx.from;
		const transitAddress = '0x' + tx.input.substring(tx.input.length - 40);

		const params = {
		    gasPrice,
		    txStatus,
		    txHash,
		    senderAddress,
		    transitAddress,
		    eventName,
		    transferStatus
		};
		
		log.debug("Pushing event to server: ", params);
		const result = await pushEventToServer(params);
		if (result.success) {
		    log.debug("Successfully added event!");
		} else {
		    log.debug("Error adding event: ", result);
		}

	    }
	} catch(err) {
	    log.debug(err);
	}
    });
}


// const subscribeForMinedDepositEvents = () => {
//     log.debug("Subscribing for mined deposit events.");
    
//     const depositEvent = escrowContract.LogDeposit();

//     depositEvent.watch(async (error, result) => {
// 	try {
// 	    log.debug("Got mined deposit event");
// 	    console.log(result);
	    
// 	    const transferFilterParams = {
// 		senderAddress: result.args.sender,
// 		transitAddress: result.args.transitAddress
// 	    };
	    
// 	    const transferStatus = 'deposited';
// 	    const eventTxStatus = 'success';
// 	    await TransferService.updateTransferEvent({
// 		transferStatus,
// 		eventTxHash: result.transactionHash,
// 		transferFilterParams,
// 		eventTxStatus
// 	    });
// 	} catch(err) {
// 	    log.debug(err);
// 	}
//     });
// }


// const subscribeForMinedCancelEvents = () => {
//     log.debug("Subscribing for mined cancel events.");
    
//     const cancelEvent = escrowContract.LogCancel();

//     cancelEvent.watch(async (error, result) => {
// 	try {
// 	    log.debug("Got mined cancel event");
// 	    console.log(result);
	   	    
// 	    const event = {
// 		txStatus: 'success',
// 		txHash: result.transactionHash,
// 		eventName: 'cancel',
// 	    };
// 	    const transferFilterParams = {
// 		senderAddress: result.args.sender,
// 		transitAddress: result.args.transitAddress
// 	    };
	    

// 	    await TransferService.addEvent({
// 		transferStatus: 'cancelled',
// 		event,
// 		transferFilterParams
// 	    });
	    
// 	} catch(err) {
// 	    log.debug(err);
// 	}
//     });
// }


// const subscribeForMinedWithdrawEvents = () => {
//     log.debug("Subscribing for mined cancel events.");
    
//     const withdrawEvent = escrowContract.LogWithdraw();

//     withdrawEvent.watch(async (error, result) => {
// 	try {
// 	    log.debug("Got mined withdraw event");
// 	    console.log(result);
	   	    
// 	    const event = {
// 		txStatus: 'success',
// 		txHash: result.transactionHash,
// 		eventName: 'withdraw',
// 	    };
// 	    const transferFilterParams = {
// 		senderAddress: result.args.sender,
// 		transitAddress: result.args.transitAddress
// 	    };
	    
// 	    await TransferService.addEvent({
// 		transferStatus: 'completed',
// 		event,
// 		transferFilterParams
// 	    });
	    
// 	} catch(err) {
// 	    log.debug(err);
// 	}
//     });
// }


const start = () => {
    subscribeForPendingEvents();
}

module.exports = {
    start
}
