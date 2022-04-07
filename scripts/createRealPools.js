function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
async function sleep() {
  return await timeout(10000)
}

function save(chainId, name, value) {
  const fs = require('fs')

  const filename = '../dotdex-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {}

  data[name] = value

  fs.writeFileSync(filename, JSON.stringify(data, null, 4))
}

async function createRealPool(address) {
  console.log('create LP pool ' + address)
  const signers = await ethers.getSigners()
  const nonce = await ethers.provider.getTransactionCount(signers[0]._address)
  const { chainId } = await ethers.provider.getNetwork()
  //const blockNumber = await ethers.provider.getBlockNumber();
  const data = get(chainId)
  const tokenA = data.WGLMR
  const tokenB = address
  await sleep()
  console.log('DotDexFactory', data.DotDexFactory)

  if (tokenA == tokenB) throw 'token names should be different'

  const DotDexFactory = await ethers.getContractAt('DotDexFactory', data.DotDexFactory)
  const PoolAddress = await DotDexFactory.createPair(tokenA, tokenB, { nonce, gasLimit: 9000000 })

  const result = await PoolAddress.wait(1)
  const event = result.events.find(x => x.event == 'PairCreated')

  const Token = await ethers.getContractAt('PancakeERC20', address)

  const symbol = await Token.symbol()

  save(chainId, 'VLX_' + symbol + '_LP', { pair: event.args.pair, tokenA, tokenB })

  return true
}

function get(chainId) {
  const fs = require('fs')

  const filename = '../dotdex-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {}

  return data
}

async function main() {
  const admins = JSON.parse(require('fs').readFileSync('../dotdex-addresses/admins.json', 'utf8'))

  const { chainId } = await ethers.provider.getNetwork()

  const items = admins.wrappedTokens[chainId.toString()]

  for (var j = 0; j < items.length; j++) {
    await createRealPool(items[j])
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
