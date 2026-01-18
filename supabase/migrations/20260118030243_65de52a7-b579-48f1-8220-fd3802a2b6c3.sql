-- Create admin audit logs table
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_admin_id UUID REFERENCES public.programme_admins(id) ON DELETE SET NULL,
  target_username TEXT,
  target_display_name TEXT,
  performed_by_id UUID REFERENCES public.programme_admins(id) ON DELETE SET NULL,
  performed_by_username TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read/insert for kiosk context (super admins will filter in app)
CREATE POLICY "Allow public read on admin_audit_logs"
ON public.admin_audit_logs
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on admin_audit_logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action);