-- Enable realtime for message reactions and pins
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_message_pins;