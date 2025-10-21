import dotenv from 'dotenv'
dotenv.config()

import { getConfig } from '../src/config';
import { isValid } from '@tma.js/init-data-node';

const config = getConfig()

const ins:string = "<init data>"

console.log(
isValid(
    ins, 
    config.TG_API_KEY,
    {expiresIn:0}
))