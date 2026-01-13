-- Create golf_groups table
CREATE TABLE public.golf_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.golf_groups(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- For non-app members (guests), store name/handicap directly
  guest_name text,
  guest_handicap numeric,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  -- Either profile_id OR guest_name must be set
  CONSTRAINT member_identity CHECK (profile_id IS NOT NULL OR guest_name IS NOT NULL)
);

-- Enable RLS on golf_groups
ALTER TABLE public.golf_groups ENABLE ROW LEVEL SECURITY;

-- Enable RLS on group_members  
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is group owner
CREATE OR REPLACE FUNCTION public.is_group_owner(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.golf_groups
    WHERE id = group_id AND owner_id = user_id
  )
$$;

-- Security definer function to check if user is a member of the group
CREATE OR REPLACE FUNCTION public.is_group_member(group_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.golf_groups g ON g.id = gm.group_id
    WHERE gm.group_id = $1 
    AND (gm.profile_id = $2 OR g.owner_id = $2)
  )
$$;

-- golf_groups policies
CREATE POLICY "Users can view groups they own or are members of"
ON public.golf_groups FOR SELECT
USING (
  owner_id = auth.uid() 
  OR public.is_group_member(id, auth.uid())
);

CREATE POLICY "Users can create their own groups"
ON public.golf_groups FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their groups"
ON public.golf_groups FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their groups"
ON public.golf_groups FOR DELETE
USING (owner_id = auth.uid());

-- group_members policies
CREATE POLICY "Users can view members of their groups"
ON public.group_members FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Group owners can add members"
ON public.group_members FOR INSERT
WITH CHECK (public.is_group_owner(group_id, auth.uid()));

CREATE POLICY "Group owners can update members"
ON public.group_members FOR UPDATE
USING (public.is_group_owner(group_id, auth.uid()));

CREATE POLICY "Group owners can remove members"
ON public.group_members FOR DELETE
USING (public.is_group_owner(group_id, auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_profile_id ON public.group_members(profile_id);
CREATE INDEX idx_golf_groups_owner_id ON public.golf_groups(owner_id);