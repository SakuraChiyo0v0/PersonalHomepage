/* eslint-disable */
// @ts-nocheck
import React from 'react'
import config from '@payload-config'
import { importMap } from '../importMap'
import { NotFoundPage, generatePageMetadata } from '@payloadcms/next/views'

const NotFound = ({ params, searchParams }: any) => (
  <NotFoundPage config={config} importMap={importMap} params={params} searchParams={searchParams} />
)

export default NotFound

export const generateMetadata = ({ params, searchParams }: any) =>
  generatePageMetadata({ config, importMap, params, searchParams })
