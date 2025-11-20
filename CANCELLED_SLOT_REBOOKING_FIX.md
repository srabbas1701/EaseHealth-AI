# Cancelled Slot Rebooking Issue - Fix Documentation

## 🐛 Problem Summary

When a patient cancels an appointment and then tries to book the same slot again, the booking fails with a database error:

```
duplicate key value violates unique constraint "appointments_doctor_id_schedule_date_start_time_key"
```

## 🔍 Root Cause Analysis

### What's Happening:

1. **Cancellation Process (Working Correctly):**
   - Time slot status: `'booked'` → `'available'` ✅
   - Appointment status: `'booked'` → `'cancelled'` ✅
   - Cancelled appointment record: **REMAINS IN DATABASE** ✅

2. **Rebooking Attempt (Failing):**
   - Slot availability check: **PASSES** ✅ (slot status is 'available')
   - Attempt to create new appointment: **FAILS** ❌
   - Reason: Database has a UNIQUE constraint on `(doctor_id, schedule_date, start_time)`
   - The cancelled appointment still occupies that unique slot combination

### Database Constraint:

```sql
CONSTRAINT appointments_doctor_id_schedule_date_start_time_key 
UNIQUE (doctor_id, schedule_date, start_time)
```

This constraint prevents **ANY** appointment (including cancelled ones) from having duplicate doctor/date/time combinations.

## ✅ Solution

### Change the constraint to only apply to **active (non-cancelled) appointments**.

This allows:
- ✅ Multiple cancelled appointments for the same slot (preserves history)
- ✅ Rebooking previously cancelled slots
- ❌ Prevents duplicate active appointments (maintains data integrity)

## 🔧 Implementation

### Step 1: Apply Database Migration

Run the following SQL in your Supabase SQL Editor:

```sql
-- Drop the existing unique constraint
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_doctor_id_schedule_date_start_time_key;

-- Create a partial unique index that only applies to non-cancelled appointments
CREATE UNIQUE INDEX appointments_doctor_date_time_unique 
ON appointments (doctor_id, schedule_date, start_time)
WHERE status != 'cancelled';
```

### Step 2: Verify the Fix

1. **Cancel an existing appointment**
2. **Go to Smart Appointment Booking page**
3. **Select the same doctor, date, and time slot**
4. **Confirm booking**
5. **Expected Result:** Appointment created successfully with queue token and Telegram notification

## 📊 Testing Checklist

- [ ] Cancel an appointment from patient dashboard
- [ ] Verify slot appears as available on booking page
- [ ] Rebook the same slot
- [ ] Verify appointment is created successfully
- [ ] Verify queue token modal appears
- [ ] Verify Telegram notification is sent
- [ ] Verify appointment appears in patient dashboard
- [ ] Verify old cancelled appointment is still in database (for history)

## 🔐 Data Integrity

This solution maintains data integrity by:

1. **Preserving History:** Cancelled appointments remain in the database for auditing
2. **Preventing Conflicts:** Only one active appointment can exist per doctor/date/time
3. **Allowing Rebooking:** Cancelled slots can be rebooked without constraint violations

## 📝 Technical Details

### Partial Unique Index

A partial unique index applies the uniqueness constraint only to rows that match the WHERE clause:

```sql
WHERE status != 'cancelled'
```

This means:
- Cancelled appointments: **NOT included in uniqueness check**
- Booked/Pending/Completed appointments: **Included in uniqueness check**

### Status Values (Reference)

According to the codebase, appointment status can be:
- `'booked'` - Active appointment
- `'completed'` - Appointment finished
- `'cancelled'` - Appointment cancelled
- `'pending'` - Waiting for confirmation
- `'no_show'` - Patient didn't show up

The constraint excludes only `'cancelled'` status, so all other statuses are protected from duplication.

## 🚀 Deployment Steps

1. Backup your appointments table (recommended)
2. Run the migration SQL in Supabase dashboard
3. Test the fix with a cancelled appointment
4. Monitor for any issues
5. Update your deployment documentation

## 📚 Related Files

- `src/utils/supabase.ts` - Contains `cancelAppointment` and `createAppointment` functions
- `supabase/migrations/fix_cancelled_appointment_rebooking.sql` - Migration file
- `src/pages/SmartAppointmentBookingPage.tsx` - Booking page that calls these functions

## 🎯 Expected Behavior After Fix

```
User cancels appointment
  ↓
Time slot → 'available'
Appointment → 'cancelled' (kept in DB)
  ↓
User rebooks same slot
  ↓
New appointment created ✅
Old appointment remains as 'cancelled' (history preserved)
Queue token generated ✅
Telegram notification sent ✅
Modal displayed ✅
```

---

**Date:** 2024-11-18
**Issue:** Cancelled slot rebooking failure
**Status:** Fixed with partial unique index
**Impact:** Allows patients to rebook cancelled slots while preserving appointment history



