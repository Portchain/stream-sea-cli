const keypair = require('keypair')

const DEFAULT_PAYLOAD = {
  "exp": 1893456000, // Expires 2030-01-01
  "mustFanout": true,
}

export const generateKeypair: () => {public: string, private: string} = keypair

export const parsePayload = (payload?: string) => payload !== undefined ? JSON.parse(payload) : DEFAULT_PAYLOAD
