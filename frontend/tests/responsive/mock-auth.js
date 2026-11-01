export function useAuthActions() {
  return {
    signIn: async () => {
      throw new Error("Responsive fixtures do not send email");
    },
    signOut: async () => {},
  };
}
export function useConvexAuth() {
  return { isLoading: false, isAuthenticated: false };
}
export function ConvexAuthProvider({ children }) {
  return children;
}
