import { Navigate, Route, Routes } from "react-router-dom";
import { Chooser } from "@/screens/Chooser";
import { DirectionShell } from "@/screens/DirectionShell";
import { Today } from "@/screens/Today";
import { Detail } from "@/screens/Detail";
import { Browse } from "@/screens/Browse";
import { Exercises } from "@/screens/Exercises";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Chooser />} />
      <Route path="/a" element={<DirectionShell direction="a" />}>
        <Route index element={<Today />} />
        <Route path="piece/:id" element={<Detail />} />
        <Route path="browse" element={<Browse />} />
        <Route path="exercises" element={<Exercises />} />
      </Route>
      <Route path="/b" element={<DirectionShell direction="b" />}>
        <Route index element={<Today />} />
        <Route path="piece/:id" element={<Detail />} />
        <Route path="browse" element={<Browse />} />
        <Route path="exercises" element={<Exercises />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
