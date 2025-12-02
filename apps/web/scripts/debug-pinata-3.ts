import { PinataSDK } from "pinata";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT || "",
    pinataGateway: "gateway.pinata.cloud",
});

console.dir(pinata, { depth: 5 });
