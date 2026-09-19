import { Navigate, Route, useLocation } from "react-router-dom";
import { AppShell } from "@/screens/AppShell";
import { Today } from "@/screens/Today";
import { Detail } from "@/screens/Detail";
import { Browse } from "@/screens/Browse";
import { Exercises } from "@/screens/Exercises";
import { Studio } from "@/screens/Studio";

/**
 * The exploration-era URLs carried a direction segment (#/a/piece/ripe-pear).
 * There is one experience now, so the segment is gone - but links are already
 * out in the world, so replay the tail on the flat route instead of dropping
 * everyone on Today and losing the piece they were sent to.
 */
function LegacyDirectionRedirect() {
  const { pathname, search } = useLocation();
  const to = pathname.replace(/^\/[ab](?=\/|$)/, "") || "/";
  return <Navigate to={{ pathname: to, search }} replace />;
}

/* One route tree, shared by the app and the tests. */
export const routeElements = (
  <>
    <Route path="/" element={<AppShell />}>
      <Route index element={<Today />} />
      <Route path="piece/:id" element={<Detail />} />
      <Route path="browse" element={<Browse />} />
      <Route path="exercises" element={<Exercises />} />
      <Route path="studio" element={<Studio />} />
    </Route>
    <Route path="/a/*" element={<LegacyDirectionRedirect />} />
    <Route path="/b/*" element={<LegacyDirectionRedirect />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </>
);
