# AI-Powered QA Review Pipeline - Local Agent

This is the local agent component for the AI-Powered QA Review Pipeline. It is a Node.js server that runs on your local machine to perform tasks that are not possible from within a web browser, such as checking out code from Git/SVN repositories, accessing the local file system, and calling the OpenAI API securely.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Git](https://git-scm.com/) installed and available in your system's PATH.
- [Subversion (SVN)](https://subversion.apache.org/) command-line client installed and available in your system's PATH.

## Setup

1.  **Navigate to this directory:**
    Open a terminal or command prompt and change into the `local-agent` directory.

    ```sh
    cd local-agent
    ```

2.  **Install Dependencies:**
    Run the following command to install the required Node.js packages.

    ```sh
    npm install
    ```

3.  **Create `.env` file:**
    The agent uses a `.env` file to securely manage your OpenAI API key. In the `local-agent` directory, create a new file named `.env`.

4.  **Configure `.env` file:**
    Open the `.env` file and configure the following variables:
    ```
    # Required: Your OpenAI API key
    API_KEY="your_openai_api_key_here"
    
    # Optional: AI model to use (default: gpt-4o)
    AI_MODEL="gpt-4o"
    
    # Database configuration
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qa_pipeline?schema=public"
    
    # Encryption key for secrets
    ENCRYPTION_KEY="your-secret-encryption-key-change-this-in-production"
    ```
    
    **Available AI Models:**
    - `gpt-4o` - Most advanced and accurate (recommended for production)
    - `gpt-4o-mini` - Faster and more cost-effective version of GPT-4o
    - `gpt-4-turbo` - GPT-4 optimized for speed
    - `gpt-3.5-turbo` - Most economical option
    
    **Note:** The `.env` file is intentionally ignored by Git to prevent your secrets from being accidentally committed.

## Running the Agent

To start the agent, run the following command from within the `local-agent` directory:

```sh
npm start
```

You should see a confirmation message in your terminal:

```
QA Pipeline Local Agent listening on http://localhost:3001
```

The agent is now running and ready to receive requests from the web UI. You can now open the `index.html` file of the main application in your browser and it should connect automatically.

**Keep this terminal window open while you are using the web application.** Closing the window will stop the agent.

## Configuration

### Changing AI Model

To change the AI model used for code analysis:

1. Stop the agent (Ctrl+C)
2. Edit the `.env` file and modify the `AI_MODEL` variable
3. Restart the agent with `npm start`

### Advanced Configuration

For detailed configuration options, see [CONFIGURATION.md](./CONFIGURATION.md) which includes:
- Model selection guidelines
- Cost considerations
- Performance recommendations
- Security best practices