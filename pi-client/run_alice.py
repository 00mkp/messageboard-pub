"""
Pi-Client Entry Point for alice
Runs the message board display for user alice
"""

if __name__ == "__main__":
    # Import alice's config
    import config_alice as config
    import sys
    sys.modules['config'] = config

    # Now run display
    import display
    display.main()
