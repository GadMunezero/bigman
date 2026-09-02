"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction} className="panel stack">
      <div>
        <label className="field-label" htmlFor="password">
          Admin password
        </label>
        <input id="password" name="password" type="password" className="input" autoFocus required />
      </div>

      {state?.error ? (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
