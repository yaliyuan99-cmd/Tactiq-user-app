import { useLocation } from 'react-router';

/** Test-only: stands in for sign-in and shows the router state it was opened with. */
export function SignInStub({ title }: { readonly title: string }) {
  const { state } = useLocation();
  return (
    <>
      <h1>{title}</h1>
      <p data-testid="sign-in-state">{JSON.stringify(state ?? null)}</p>
    </>
  );
}
