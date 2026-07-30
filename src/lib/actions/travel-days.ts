"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mutationResult, type ActionResult } from "./types";

export type TravelDayInput = {
  travelDate: string;
  hotelName: string | null;
  hotelAddress: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  departureTime: string | null;
  meetingLocation: string | null;
  itinerary: string | null;
};

export async function createTravelDay(input: TravelDayInput): Promise<ActionResult> {
  const profile = await requireRole("director", "admin");

  if (!input.travelDate) return { error: "Travel date is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("travel_days").insert({
    travel_date: input.travelDate,
    hotel_name: input.hotelName,
    hotel_address: input.hotelAddress,
    check_in_time: input.checkInTime,
    check_out_time: input.checkOutTime,
    departure_time: input.departureTime,
    meeting_location: input.meetingLocation,
    itinerary: input.itinerary,
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/travel");
  return { error: null };
}

export async function updateTravelDay(id: string, input: TravelDayInput): Promise<ActionResult> {
  await requireRole("director", "admin");

  if (!input.travelDate) return { error: "Travel date is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("travel_days")
    .update({
      travel_date: input.travelDate,
      hotel_name: input.hotelName,
      hotel_address: input.hotelAddress,
      check_in_time: input.checkInTime,
      check_out_time: input.checkOutTime,
      departure_time: input.departureTime,
      meeting_location: input.meetingLocation,
      itinerary: input.itinerary,
    })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/travel");
  return result;
}

export async function deleteTravelDay(id: string): Promise<ActionResult> {
  await requireRole("director", "admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("travel_days")
    .delete()
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/travel");
  return result;
}
