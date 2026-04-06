"""
Pi-Client Entry Point for bob
Runs the message board display for bob
"""

if __name__ == "__main__":
    # Import bob's config by renaming it
    import config_bob as config
    import sys
    sys.modules['config'] = config

    # Now run display
    import display
    display.main()
