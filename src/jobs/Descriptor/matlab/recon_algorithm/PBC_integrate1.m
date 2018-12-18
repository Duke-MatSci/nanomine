function core = PBC_integrate1(img, L, cpx)
% apply periodic boundary conditions when assigning the cluster geometries
% Xiaolin Li
% Jul, 2015
% Northwestern University
ll = length(img(1,:,:));
core = img(cpx:L+cpx-1, cpx:L+cpx-1, cpx:L+cpx-1);
xl = length(core(1,:,:)); % length of the core

corner1 = img(1:cpx-1+5, 1:cpx-1+5, 1:cpx-1+5);
corner2 = img(1:cpx-1+5, 1:cpx-1+5, -5+L+cpx:ll);
corner3 = img(1:cpx-1+5, -5+L+cpx:ll, 1:cpx-1+5);
corner4 = img(1:cpx-1+5, -5+L+cpx:ll, -5+L+cpx:ll);
corner5 = img(-5+L+cpx:ll, 1:cpx-1+5, 1:cpx-1+5);
corner6 = img(-5+L+cpx:ll, 1:cpx-1+5, -5+L+cpx:ll);
corner7 = img(-5+L+cpx:ll, -5+L+cpx:ll, 1:cpx-1+5);
corner8 = img(-5+L+cpx:ll, -5+L+cpx:ll, -5+L+cpx:ll);

bd1 = img(1:cpx-1+5, cpx:L+cpx-1, cpx:L+cpx-1);
bd2 = img(-5+L+cpx:ll, cpx:L+cpx-1, cpx:L+cpx-1);
bd3 = img(cpx:L+cpx-1, 1:cpx-1+5, cpx:L+cpx-1);
bd4 = img(cpx:L+cpx-1, -5+L+cpx:ll, cpx:L+cpx-1);
bd5 = img(cpx:L+cpx-1, cpx:L+cpx-1, 1:cpx-1+5);
bd6 = img(cpx:L+cpx-1, cpx:L+cpx-1, -5+L+cpx:ll);

% add periodic bds to core
core(xl-cpx-3:xl, 1:xl, 1:xl) = core(xl-cpx-3:xl, 1:xl, 1:xl) + bd1;
core(1:ll-L-cpx+6, 1:xl, 1:xl) = core(1:ll-L-cpx+6, 1:xl, 1:xl) + bd2;
core(1:xl, xl-cpx-3:xl, 1:xl) = core(1:xl, xl-cpx-3:xl, 1:xl) + bd3;
core(1:xl, 1:ll-L-cpx+6, 1:xl) = core(1:xl, 1:ll-L-cpx+6, 1:xl) + bd4;
core(1:xl, 1:xl, xl-cpx-3:xl) = core(1:xl, 1:xl, xl-cpx-3:xl) +bd5;
core(1:xl, 1:xl, 1:ll-L-cpx+6) = core(1:xl, 1:xl, 1:ll-L-cpx+6) +bd6;

%add periodic corners to core
core(xl-cpx-3:xl, xl-cpx-3:xl, xl-cpx-3:xl) = core(xl-cpx-3:xl, xl-cpx-3:xl, xl-cpx-3:xl) + corner1;
core(xl-cpx-3:xl, xl-cpx-3:xl, 1:ll-L-cpx+6) = core(xl-cpx-3:xl, xl-cpx-3:xl, 1:ll-L-cpx+6) + corner2;
core(xl-cpx-3:xl, 1:ll-L-cpx+6, xl-cpx-3:xl) = core(xl-cpx-3:xl, 1:ll-L-cpx+6, xl-cpx-3:xl) + corner3;
core(xl-cpx-3:xl, 1:ll-L-cpx+6, 1:ll-L-cpx+6) = core(xl-cpx-3:xl, 1:ll-L-cpx+6, 1:ll-L-cpx+6) + corner4;
core(1:ll-L-cpx+6, xl-cpx-3:xl, xl-cpx-3:xl) = core(1:ll-L-cpx+6, xl-cpx-3:xl, xl-cpx-3:xl) + corner5;
core(1:ll-L-cpx+6, xl-cpx-3:xl, 1:ll-L-cpx+6) = core(1:ll-L-cpx+6, xl-cpx-3:xl, 1:ll-L-cpx+6) + corner6;
core(1:ll-L-cpx+6, 1:ll-L-cpx+6, xl-cpx-3:xl) = core(1:ll-L-cpx+6, 1:ll-L-cpx+6, xl-cpx-3:xl) + corner7;
core(1:ll-L-cpx+6, 1:ll-L-cpx+6, 1:ll-L-cpx+6) = core(1:ll-L-cpx+6, 1:ll-L-cpx+6, 1:ll-L-cpx+6) + corner8; 




end