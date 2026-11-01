import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Linking from "expo-linking";
import {
  ConvexReactClient,
  useConvexAuth as useServerAuth,
  useQuery,
} from "convex/react";
import { anyApi as api } from "convex/server";
import {
  ConvexAuthProvider,
  useAuthActions,
  useConvexAuth,
} from "@convex-dev/auth/react";
import { config } from "./config";
import { codeFromLink, errorMessage, secureStorageAdapter } from "./core";

export { api };
const client = new ConvexReactClient(config.convexUrl, {
  unsavedChangesWarning: false,
});
const memory = new Map();
const storage =
  Platform.OS === "web"
    ? {
        getItem: (key) => memory.get(key) || null,
        setItem: (key, value) => {
          memory.set(key, value);
        },
        removeItem: (key) => {
          memory.delete(key);
        },
      }
    : secureStorageAdapter(SecureStore);
const Session = createContext(null);
export const useSession = () => useContext(Session);
function SessionState({ children }) {
  const auth = useConvexAuth(),
    server = useServerAuth(),
    actions = useAuthActions();
  const [refresh, setRefresh] = useState(0),
    [pending, setPending] = useState(null),
    [linkError, setLinkError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false),
    seen = useRef(new Set());
  const session = useQuery(
    api.accounts.current,
    server.isAuthenticated ? { refresh } : "skip",
  );
  useEffect(() => {
    const timer = setInterval(() => setRefresh(Date.now()), 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setRefresh(Date.now());
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  useEffect(() => {
    let active = true;
    const accept = (url) => {
      const code = codeFromLink(url);
      if (active && code) setPending(code);
    };
    Linking.getInitialURL()
      .then(accept)
      .catch(() => {});
    const listener = Linking.addEventListener("url", (event) =>
      accept(event.url),
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (!pending || auth.isLoading || seen.current.has(pending)) return;
    seen.current.add(pending);
    Promise.resolve().then(() => {
      setLinkBusy(true);
      setLinkError("");
    });
    actions
      .signIn(undefined, { code: pending })
      .then((result) => {
        if (!result.signingIn) throw new Error("Expired");
      })
      .catch(() =>
        setLinkError(
          "This sign-in link is invalid or expired. Request a new email code or link.",
        ),
      )
      .finally(() => {
        setPending(null);
        setLinkBusy(false);
      });
  }, [pending, auth.isLoading, actions]);
  const request = useCallback(async (path, method = "GET", body = {}) => {
    const url = new URL(path, "https://mlezi.local");
    return method === "GET"
      ? client.query(api.marketplace.read, {
          path: url.pathname,
          params: Object.fromEntries(url.searchParams),
        })
      : client.mutation(api.marketplace.write, {
          path: url.pathname,
          method,
          body,
        });
  }, []);
  const value = useMemo(
    () => ({
      auth,
      server,
      actions,
      session,
      client,
      request,
      linkError,
      linkBusy,
      refresh: () => setRefresh(Date.now()),
    }),
    [auth, server, actions, session, request, linkError, linkBusy],
  );
  return <Session.Provider value={value}>{children}</Session.Provider>;
}
export function MobileProvider({ children }) {
  return (
    <ConvexAuthProvider
      client={client}
      storage={storage}
      storageNamespace={`mlezi-mobile-${config.convexUrl}`}
      shouldHandleCode={false}
    >
      <SessionState>{children}</SessionState>
    </ConvexAuthProvider>
  );
}
// A watched query keeps server-side changes live while letting each screen show
// recoverable errors rather than throwing its whole navigation tree away.
export function useRead(path) {
  const { session, auth, refresh } = useSession();
  const [state, setState] = useState({ data: null, error: "", scope: "" });
  const [revision, setRevision] = useState(0);
  const accountId = session?.account?.id;
  const scope = `${path}|${accountId || "guest"}|${auth.isAuthenticated}`;
  useEffect(() => {
    if (!path) return;
    const url = new URL(path, "https://mlezi.local");
    const watch = client.watchQuery(api.marketplace.read, {
      path: url.pathname,
      params: {
        ...Object.fromEntries(url.searchParams),
        _refresh: `${refresh}-${revision}`,
      },
    });
    let active = true;
    const update = () => {
      if (!active) return;
      try {
        const data = watch.localQueryResult();
        if (data !== undefined) setState({ data, error: "", scope });
      } catch (error) {
        setState({ data: null, error: errorMessage(error), scope });
      }
    };
    const unsubscribe = watch.onUpdate(update);
    update();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [path, revision, scope, refresh]);
  return {
    data: state.scope === scope ? state.data : null,
    error: state.scope === scope ? state.error : "",
    reload: () => setRevision((value) => value + 1),
  };
}
