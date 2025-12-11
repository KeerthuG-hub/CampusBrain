// lib/supabase/middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  // MUST create a response object first
  const res = NextResponse.next()

  // Bind supabase to both req + res
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session (VERY IMPORTANT)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Example protected route (OPTIONAL)
  // if (!session && req.nextUrl.pathname.startsWith('/faculty')) {
  //   return NextResponse.redirect(new URL('/login', req.url))
  // }

  return res
}
