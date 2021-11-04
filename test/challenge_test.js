const { expect } = require("chai")
const fs = require("fs")
const { deploy } = require("../scripts/lib")

describe("Challenge contract", function () {
  if (!fs.existsSync("/tmp/cannon/golden.json")) {
    console.log("golden file doesn't exist, skipping test")
    return
  }

  beforeEach(async function () {
    [c, m, mm] = await deploy()
  })
  it("challenge contract deploys", async function() {
    console.log("Challenge deployed at", c.address)
  })
  it("initiate challenge", async function() {
    // TODO: is there a better way to get the "HardhatNetworkProvider"?
    const hardhat = network.provider._wrapped._wrapped._wrapped._wrapped._wrapped
    const blockchain = hardhat._node._blockchain

    // get data
    const blockNumberN = (await ethers.provider.getBlockNumber())-1;
    const blockNp1 = blockchain._data._blocksByNumber.get(blockNumberN+1)
    const blockNp1Rlp = blockNp1.header.serialize()

    const assertionRoot = "0x9e0261efe4509912b8862f3d45a0cb8404b99b239247df9c55871bd3844cebbd"
    let startTrie = JSON.parse(fs.readFileSync("/tmp/cannon/golden.json"))
    let finalTrie = JSON.parse(fs.readFileSync("/tmp/cannon/0_13284469/checkpoint_final.json"))
    let preimages = Object.assign({}, startTrie['preimages'], finalTrie['preimages']);
    const finalSystemState = finalTrie['root']

    let cdat = c.interface.encodeFunctionData("InitiateChallenge", [blockNumberN, blockNp1Rlp, assertionRoot, finalSystemState, 1])

    while (1) {
      try {
        // TODO: make this eth call?
        // needs something like InitiateChallengeWithTrieNodesj
        await c.CallWithTrieNodes(cdat, [])
        break
      } catch(e) {
        const missing = e.toString().split("'")[1]
        if (missing.length == 64) {
          console.log("requested node", missing)
          let node = preimages["0x"+missing]
          expect(node).to.not.be.an('undefined')
          const bin = Uint8Array.from(Buffer.from(node, 'base64').toString('binary'), c => c.charCodeAt(0))
          await mm.AddTrieNode(bin)
          continue
        } else {
          console.log(e)
          break
        }
      }
    }

    //const blockHeaderNp1 = getBlockRlp(await ethers.provider.getBlock(blockNumberN+1));
    //console.log(blockNumberN, blockHeaderNp1);
  })
})