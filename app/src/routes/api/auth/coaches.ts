import { publicCoaches } from "~/lib/soccer/store";
import { coachAuthUnavailable } from "~/lib/auth/coach-auth-response";

export const GET = () => {
  try {
    return Response.json({ coaches: publicCoaches() });
  } catch (error) {
    return coachAuthUnavailable(error);
  }
};
