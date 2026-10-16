import React from 'react';
import * as sdk from '@clerk/expo';
import * as legacy from '@clerk/expo/legacy';
import { createClient } from '@supabase/supabase-js';
import { configureAuthSdk } from './auth';
import { configureSupabaseSdk } from './supabase';

configureAuthSdk(sdk, legacy);
configureSupabaseSdk(createClient);

/** This module is never evaluated in offline demo mode. */
export default function IntegrationBoot({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
