import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <>
        <img
          src="/adk.png"
          alt="TypeScript"
          width={30}
          height={30}
          style={{ verticalAlign: 'middle', marginRight: 2, borderRadius: 8 }}
        />
        ADK-TS
      </>
    ),
  },
  githubUrl: 'https://github.com/IQAICOM/adk-ts',

};
