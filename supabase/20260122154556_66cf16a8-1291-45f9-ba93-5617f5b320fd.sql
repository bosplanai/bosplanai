-- Insert default privacy policy setting
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('privacy_policy', '')
ON CONFLICT (setting_key) DO NOTHING;