
const Web3 = require('web3')
const axios = require('axios')
const EthereumTx = require('ethereumjs-tx')
const ansi = require('ansicolor').nice
const log = require('ololog').configure({ time: true })
const { of } = require('await-of')
const testnet = 'https://rinkeby.infura.io/v3/0a34984fff0f422d9014920b00805737'
const web3 = new Web3(new Web3.providers.HttpProvider(testnet))

const getCurrentGasPrices = async () => {
    let response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json')
    // To convert the provided values to gwei, divide by 10
    let prices = {
        low: response.data.safeLow / 10,
        medium: response.data.average / 10,
        high: response.data.fast / 10
    }

    log("\r\n")
    log(`Current ETH Gas Prices (in GWEI):`.cyan)
    log("\r\n")
    log(`Low: ${prices.low} (transaction completes in < 30 minutes)`.green)
    log(`Standard: ${prices.medium} (transaction completes in < 5 minutes)`.yellow)
    log(`Fast: ${prices.high} (transaction completes in < 2 minutes)`.red)
    log("\r\n")
    return prices
}

async function signAndTransact(masterWallet, details) {
    const transaction = new EthereumTx(details)

    // The private key is what unlocks your wallet.
    transaction.sign(Buffer.from(masterWallet.private_key, 'hex'))
    const serializedTransaction = transaction.serialize()
    const addr = transaction.from.toString('hex')
    // logger.info(`Based on your private key, your wallet address is ${addr}`)
    const transaction_details = await web3.eth.sendSignedTransaction('0x' + serializedTransaction.toString('hex'))
    return transaction_details
}

async function makeEtherTransaction(masterWallet, transactionDetails) {
    // logger.info("Setting default acount to ", masterWallet.public_key)

    web3.eth.defaultAccount = masterWallet.public_key
    let nonce = await web3.eth.getTransactionCount(web3.eth.defaultAccount)
    // logger.info(`The outgoing transaction count for your wallet address is: ${nonce}`)

    // Fetch the current transaction gas prices from https://ethgasstation.info/
    let gasPrices = await getCurrentGasPrices()
    // logger.info("Gas Prices", gasPrices)
    let details = {
        "to": transactionDetails.receiversAddress,
        "value": web3.utils.toHex(web3.utils.toWei(transactionDetails.amountToSend.toString(), 'ether')),
        "gas": 21000,
        "gasPrice": gasPrices.low * 1000000000, // converts the gwei price to wei
        "nonce": nonce,
        "chainId": 4 // EIP 155 chainId - mainnet: 1, rinkeby: 4
    }

    // logger.info("Transaction details", details)
    const [transaction_details, error] = await of(signAndTransact(masterWallet, details))
    if (error) {
        return { success: false, error }
    }
    // public Etherscan url
    const url = `https://rinkeby.etherscan.io/tx/${transaction_details.transactionHash}`
    // logger.info("Public Etherscan URL", url)
    log(url.cyan)
    console.log("\n\n========transaction_details=========\n\n", transaction_details, "\n\n=================\n\n")
    return { success: true, ...transaction_details, nonce }
}
module.exports = makeEtherTransaction
const masterWallet = {
    public_key: '0x1E132605de85AFD8644f831941F2cCFCAedeb94F',
    private_key: 'B5E865CF2D06760EB1FFF3C72157D6123A46845562619FAB95E8706F9FEB6645'
}
const transactionDetails = {
    receiversAddress: '0xAe14738a9F13b37DB5fe1f8fA4442BDaEFd4fEAC'
    , amountToSend: 1
}
makeEtherTransaction(masterWallet, transactionDetails) 