import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

test("renders workspace shell", async () => {
  render(<App />);
  await waitFor(() => {
    expect(screen.getByText(/Loading challenge/i)).toBeInTheDocument();
  });
});
