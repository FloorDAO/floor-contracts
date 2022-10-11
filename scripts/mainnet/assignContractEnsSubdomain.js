const {ethers} = require('hardhat');
const namehash = require('eth-ens-namehash');
const labelhash = (label) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(label))

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const ENS_PUB_REGISTRY = '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41';

const BASE_DOMAIN = 'floordao.eth';
const SUBDOMAIN = 'treasury';
const ADDRESS = '';
const FORCE = false;


async function main() {
	console.log('');

	// Get our deployer
	const [deployer] = await ethers.getSigners();

	// Load up our ENS registry contact reference
	const ens = await ethers.getContractAt('IENSRegistry', ENS_REGISTRY);
	const ensPublicRegistry = await ethers.getContractAt('IENSPublicRegistry', ENS_PUB_REGISTRY);

	// Check if the subdomain already exists. If it doesn't, we can attempt to create it. If it does
	// already exist then we will overwrite if the FORCE flag is set to `true`.
	let subdomainExists = false;
	let existingSubdomainOwner = await ens.owner(namehash.hash(`${SUBDOMAIN}.${BASE_DOMAIN}`));
	if (existingSubdomainOwner != ZERO_ADDRESS) {
		subdomainExists = true;

		if (!FORCE) {
			console.log(`This subdomain already exists.`);
			console.log('Process has been aborted. No changes have been made.');
			process.exit(0);
		}
		else {
			console.log(`This subdomain already exists. The address will be updated during mapping.`);
		}
	}
	else {
		console.log('Subdomain does not currently exist. It will be created during mapping.');
	}

	// Get our current owner and compare it to our deployer
	let baseDomainOwner = await ens.owner(namehash.hash(BASE_DOMAIN));
	if (baseDomainOwner != deployer.address) {
		console.log(`Deployer (${deployer.address}) does not match the domain owner (${baseDomainOwner}).`);
		console.log('Process has been aborted. No changes have been made.');
		process.exit(0);
	}

	// If the subdomain does not exist, we need to create it
	if (!subdomainExists) {
		// Set our subnode owner to our deployer
    	await ens.setSubnodeOwner(namehash.hash(BASE_DOMAIN), labelhash(SUBDOMAIN), deployer.address).then(async (tx) => {
    		console.log(`\nSubnode owner is being set to ${deployer.address}: ${tx.hash}`);
    		await tx.wait();
    		console.log('Done.');
    	});

    	// Set the resolver to the mainnet ENS contract
    	await ens.setResolver(namehash.hash(`${SUBDOMAIN}.${BASE_DOMAIN}`), ENS_PUB_REGISTRY).then(async (tx) => {
    		console.log(`\nResolver is being set to ${ENS_PUB_REGISTRY}: ${tx.hash}`);
    		await tx.wait();
			console.log('Done.');
		});
    }

    // Map our new subdomain to the desired contract address
   	await ensPublicRegistry.setAddr(namehash.hash(`${SUBDOMAIN}.${BASE_DOMAIN}`), ADDRESS).then(async (tx) => {
   		console.log(`\nMapping ${SUBDOMAIN}.${BASE_DOMAIN} => ${ADDRESS}..`);
		await tx.wait();
		console.log('Done.');
   	});

   	console.log('\n\n---\nProcess completed successfully.\n')

}


main().then(() => process.exit()).catch((error) => {
	console.error(error);
	process.exit(1);
});
