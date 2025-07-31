-- Grant execute permissions on software management RPC functions
GRANT EXECUTE ON FUNCTION assign_required_software_to_classroom(UUID, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION assign_required_software_to_classroom(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_required_software_to_classroom(UUID, BOOLEAN) TO service_role;

-- Also grant permissions on the auto-assign all function if it exists
GRANT EXECUTE ON FUNCTION auto_assign_all_required_software(BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION auto_assign_all_required_software(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_assign_all_required_software(BOOLEAN) TO service_role;