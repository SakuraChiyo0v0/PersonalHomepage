/* eslint-disable */
// @ts-nocheck
import React from 'react'
import config from '@payload-config'
import { importMap } from '../importMap'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'

const Page = ({ params, searchParams }: any) => (
  <RootPage config={config} importMap={importMap} params={params} searchParams={searchParams} />
)

export default Page

export const generateMetadata = ({ params, searchParams }: any) =>
  generatePageMetadata({ config, importMap, params, searchParams })
