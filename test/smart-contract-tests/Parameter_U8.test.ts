import {
    AccountTransaction,
    AccountTransactionHeader,
    AccountTransactionSignature,
    AccountTransactionType,
    UpdateContractPayload,
    ContractAddress,
} from '../../src/types';
import * as ed from 'noble-ed25519';
import { getAccountTransactionSignDigest } from '../../src/serialization';
import { getNodeClient } from '../testHelpers';
import { AccountAddress } from '../../src/types/accountAddress';
import { GtuAmount } from '../../src/types/gtuAmount';
import { TransactionExpiry } from '../../src/types/transactionExpiry';
import { Buffer } from 'buffer/';
import { getModuleBuffer } from '../../src/deserializeSchema';
import { serializeUpdateContractParameters } from '../../src/serialization';

const client = getNodeClient();
const senderAccountAddress =
    '4ZJBYQbVp3zVZyjCXfZAAYBVkJMyVj8UKUNj9ox5YqTCBdBq2M';
const wrongPrivateKey =
    'ce432f6cca0d47caec1f45739331dc354b6d749fdb8ab7c2b7f6cb24db39ca0c';
// test case for update contract
// Source of module: test/resources/smartcontracts/INDBankBool1
test('Parameter of U8 with the wrong private key', async () => {
    const nextAccountNonce = await client.getNextAccountNonce(
        new AccountAddress(senderAccountAddress)
    );
    if (!nextAccountNonce) {
        throw new Error('Nonce not found!');
    }
    const header: AccountTransactionHeader = {
        expiry: new TransactionExpiry(new Date(Date.now() + 3600000)),
        nonce: nextAccountNonce.nonce,
        sender: new AccountAddress(senderAccountAddress),
    };

    const contractName = 'INDBankBool1';
    const receiveFunctionName = 'insertAmount';
    const receiveName = contractName + '.' + receiveFunctionName;
    const userInput = 20;

    const contractAddress = {
        index: BigInt(116),
        subindex: BigInt(0),
    } as ContractAddress;

    const modulefileBuffer = getModuleBuffer(
        'test/resources/schemaFiles/schema8.bin'
    );
    const inputParams = serializeUpdateContractParameters(
        contractName,
        receiveFunctionName,
        userInput,
        modulefileBuffer
    );
    const baseEnergy = 30000n;

    const updateModule: UpdateContractPayload = {
        amount: new GtuAmount(1000n),
        contractAddress: contractAddress,
        receiveName: receiveName,
        parameter: inputParams,
        maxContractExecutionEnergy: baseEnergy,
    } as UpdateContractPayload;

    const updateContractTransaction: AccountTransaction = {
        header: header,
        payload: updateModule,
        type: AccountTransactionType.UpdateSmartContractInstance,
    };

    const hashToSign = getAccountTransactionSignDigest(
        updateContractTransaction
    );
    const signature = Buffer.from(
        await ed.sign(hashToSign, wrongPrivateKey)
    ).toString('hex');
    const signatures: AccountTransactionSignature = {
        0: {
            0: signature,
        },
    };

    const result = await client.sendAccountTransaction(
        updateContractTransaction,
        signatures
    );

    expect(result).toBeTruthy();
}, 300000);
