import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import TournamentsPage from "./pages/TournamentsPage";
import TournamentDetailPage from "./pages/TournamentDetailPage";
import RankingsPage from "./pages/RankingsPage";
import HeadToHeadPage from "./pages/HeadToHeadPage";
import CareerStatsPage from "./pages/CareerStatsPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/rankings" component={RankingsPage} />
      <Route path="/tournaments" component={TournamentsPage} />
      <Route path="/tournaments/:id" component={TournamentDetailPage} />
      <Route path="/head-to-head" component={HeadToHeadPage} />
      <Route path="/career-stats" component={CareerStatsPage} />
      <Route path="/players/:player" component={PlayerProfilePage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
