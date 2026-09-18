import { Navigate, Route, Routes } from "react-router-dom";
import { DirectionShell } from "@/screens/DirectionShell";
import { Today } from "@/screens/Today";
import { Detail } from "@/screens/Detail";
import { Browse } from "@/screens/Browse";
import { Exercises } from "@/screens/Exercises";

export function App() {
  return (
    <Routes>
      <Route path="/a" element={<DirectionShell direction="a" />}>
        <Route index element={<Today />} />
        <Route path="piece/:id" element={<Detail />} />
        <Route path="browse" element={<Browse />} />
        <Route path="exercises" element={<Exercises />} />
      </Route>
      {/* Exploration routes collapsed into the single approved experience. */}
      <Route path="/" element={<Navigate to="/a" replace />} />
      <Route path="*" element={<Navigate to="/a" replace />} />
    </Routes>
  );
}
