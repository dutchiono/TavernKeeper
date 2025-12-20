import { PinataSDK } from "pinata";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT || "",
    pinataGateway: "gateway.pinata.cloud",
});

console.log("Pinata Object Keys:", Object.keys(pinata));
if (pinata.upload) {
    console.log("Pinata Upload Keys:", Object.keys(pinata.upload));
} else {
    console.log("pinata.upload is undefined");
}
