import { TypedAccountParser } from '@helium/account-fetch-cache'
import { useAccount } from '@helium/account-fetch-cache-hooks'
import {
  JsonMetadata,
  Metadata,
  parseMetadataAccount,
  sol,
  toMetadata,
} from '@metaplex-foundation/js'
import { NATIVE_MINT } from '@solana/spl-token'
import { AccountInfo, PublicKey } from '@solana/web3.js'
import axios from 'axios'
import { useMemo } from 'react'
import { useAsync } from 'react-async-hook'

const MPL_PID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache: Record<string, Promise<any>> = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMetadata(uri: string | undefined): Promise<any | undefined> {
  if (uri) {
    if (!cache[uri]) {
      cache[uri] = axios
        .get(uri, {
          timeout: 3000,
        })
        .then((res) => res)
    }
    return cache[uri]
  }
  return Promise.resolve(undefined)
}

export const METADATA_PARSER: TypedAccountParser<Metadata> = (
  publicKey: PublicKey,
  account: AccountInfo<Buffer>,
) => {
  return toMetadata(
    parseMetadataAccount({
      ...account,
      lamports: sol(account.lamports),
      data: account.data,
      publicKey,
    }),
  )
}

export function getMetadataId(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata', 'utf-8'), MPL_PID.toBuffer(), mint.toBuffer()],
    MPL_PID,
  )[0]
}

type TokenInfo = {
  name: string
  symbol: string
  logoURI: string
}

export const tokenInfoToMetadata = (
  tokenInfo: TokenInfo | null | undefined,
): JsonMetadata | undefined => {
  if (!tokenInfo) return undefined

  return {
    json: {
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      image: tokenInfo.logoURI,
    },
    symbol: tokenInfo.symbol,
    name: tokenInfo.name,
  }
}

const USDC = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
export function useMetaplexMetadata(mint: PublicKey | undefined): {
  loading: boolean
  metadata: Metadata | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any | undefined
  symbol: string | undefined
  name: string | undefined
} {
  const metadataAddr = useMemo(() => {
    if (mint) {
      return getMetadataId(mint)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mint?.toBase58()])

  const { info: metadataAcc, loading } = useAccount(
    metadataAddr,
    METADATA_PARSER,
    true,
  )

  const { result: json, loading: jsonLoading } = useAsync(getMetadata, [
    metadataAcc?.uri,
  ])

  if (mint?.equals(NATIVE_MINT)) {
    return {
      metadata: undefined,
      loading: false,
      json: {
        name: 'SOL',
        symbol: 'SOL',
        image:
          'https://github.com/solana-labs/token-list/blob/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png?raw=true',
      },
      symbol: 'SOL',
      name: 'SOL',
    }
  }

  if (mint?.equals(USDC)) {
    return {
      metadata: undefined,
      loading: false,
      json: {
        name: 'USDC',
        symbol: 'USDC',
        image:
          'https://github.com/solana-labs/token-list/blob/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png?raw=true',
      },
      symbol: 'USDC',
      name: 'USDC',
    }
  }

  return {
    loading: jsonLoading || loading,
    json: json?.data,
    metadata: metadataAcc,
    symbol: json?.data.symbol || metadataAcc?.symbol,
    name: json?.data.name || metadataAcc?.name,
  }
}
