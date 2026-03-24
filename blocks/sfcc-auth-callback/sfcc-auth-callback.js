export default async function decorate(block) {
  const div = document.createElement('div');
  div.innerHTML = `
      <div>
        <p>Authenticating...</p>
      </div>
    `;
  block.appendChild(div);
}
