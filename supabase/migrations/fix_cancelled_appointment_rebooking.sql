-- Fix: Allow rebooking of cancelled appointment slots
-- Issue: The unique constraint prevents creating a new appointment for a slot that was previously cancelled
-- Solution: Change the constraint to only apply to non-cancelled appointments

-- Drop the existing unique constraint
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_doctor_id_schedule_date_start_time_key;

-- Create a partial unique index that only applies to non-cancelled appointments
CREATE UNIQUE INDEX appointments_doctor_date_time_unique 
ON appointments (doctor_id, schedule_date, start_time)
WHERE status != 'cancelled';

-- Note: This allows multiple cancelled appointments for the same slot (for history)
-- but prevents duplicate active/booked appointments



