import { google } from "googleapis";
 
import key from '../../accountkey.json' assert { type: "json" };

export const spreadsheetId = '1zEsn81g7fw0dDzuWgYf_li0CxE3P-V0ueZ4Zt3fZ5Oo';

const client = new google.auth.JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/spreadsheets']);

const sheets  = google.sheets({version: 'v4', auth: client});

export default sheets;