import { createServerClient } from '@supabase/ssr'
import { type Handle, redirect } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_DEMO_EMAIL, PUBLIC_DEMO_PASSWORD } from '$env/static/public'

const supabase: Handle = async ({ event, resolve }) => {
  /**
   * Creates a Supabase client specific to this server request.
   *
   * The Supabase client gets the Auth token from the request cookies.
   */
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      /**
       * SvelteKit's cookies API requires `path` to be explicitly set in
       * the cookie options. Setting `path` to `/` replicates previous/
       * standard behavior.
       */
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' })
        })
      },
    },
  })

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  event.locals.safeGetSession = async () => {
    const {
      data: { session },
    } = await event.locals.supabase.auth.getSession()
    if (!session) {
      return { session: null, user: null }
    }

    const {
      data: { user },
      error,
    } = await event.locals.supabase.auth.getUser()
    if (error) {
      // JWT validation has failed
      return { session: null, user: null }
    }

    return { session, user }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      /**
       * Supabase libraries use the `content-range` and `x-supabase-api-version`
       * headers, so we need to tell SvelteKit to pass it through.
       */
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession()
  event.locals.session = session
  event.locals.user = user

  // no auth guards for demo

  // if (!event.locals.session && event.url.pathname.startsWith('/portal')) {
  //   redirect(303, '/auth')
  // }

  // if (!event.locals.session && event.url.pathname.startsWith('/experiments')) {
  //   redirect(303, '/auth')
  // }

  // if (event.locals.session && event.url.pathname === '/auth') {
  //   redirect(303, '/portal/root')
  // }

  if (!event.locals.session && event.url.pathname.startsWith('/portal/demo_429ed69f-28e9-4663-8e71-222a7fbc7533')) {
    const { data, error } = await event.locals.supabase.auth.signInWithPassword({
        email: PUBLIC_DEMO_EMAIL,
        password: PUBLIC_DEMO_PASSWORD,
    })

    redirect(303, '/experiments/429ed69f-28e9-4663-8e71-222a7fbc7533/views/c2fd6ee5-940e-407b-90a1-2cf98b9df89b')
  }

  if (!event.locals.session && event.url.pathname.startsWith('/portal/demo_directory_429ed69f-28e9-4663-8e71-222a7fbc7533')) {
    const { data, error } = await event.locals.supabase.auth.signInWithPassword({
        email: PUBLIC_DEMO_EMAIL,
        password: PUBLIC_DEMO_PASSWORD,
    })

    redirect(303, '/portal/root')
  }

  return resolve(event)
}

export const handle: Handle = sequence(supabase, authGuard)