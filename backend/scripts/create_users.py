"""Script to create initial users"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
import auth

def main():
    print("Initializing database...")
    database.init_db()
    
    print("\nCreating users...")

    # Create user alice
    if auth.create_user("alice", "changeme"):
        print("✓ Created alice")
    else:
        print("ℹ alice already exists")

    # Create user bob
    if auth.create_user("bob", "changeme"):
        print("✓ Created bob")
    else:
        print("ℹ bob already exists")

    print("\n✓ Setup complete!")
    print("\nCredentials:")
    print("  alice: changeme")
    print("  bob: changeme")

if __name__ == "__main__":
    main()
