/*
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-base-black text-gray-100 font-inter antialiased;
  }
  h1, h2, h3, h4, h5, h6 {
    @apply font-oswald font-bold; /* Or font-barlow-condensed */
  }
  h1 { @apply text-3xl md:text-4xl; } /* 32px */
  h2 { @apply text-2xl md:text-3xl; } /* 24px */
  h3 { @apply text-xl md:text-2xl; } /* 20px */

  /* Custom scrollbar for webkit browsers */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #1f2937; /* gray-800 */
  }
  ::-webkit-scrollbar-thumb {
    background: #4b5563; /* gray-600 */
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #6b7280; /* gray-500 */
  }
}

@layer components {
  .btn {
    @apply py-3 px-6 rounded-lg font-bold text-center transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-black;
    min-height: 44px; /* NFR-USAB-010 */
    min-width: 44px; /* NFR-USAB-010 */
    letter-spacing: 0.05em; /* CTA style */
  }
  .btn-primary {
    @apply bg-green-500 text-base-black hover:bg-green-600 focus:ring-green-400;
  }
  .btn-secondary {
    @apply bg-gray-700 text-gray-100 hover:bg-gray-600 focus:ring-gray-500;
  }
  .btn-danger {
    @apply bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
  }
  .input-field {
    @apply block w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent;
  }
  .card {
    @apply bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md;
  }
  .tab-item {
    @apply flex flex-col items-center justify-center flex-1 py-2 px-1 text-xs text-gray-400 hover:text-green-400 transition-colors;
  }
  .tab-item.active {
    @apply text-green-500;
  }
}
*/