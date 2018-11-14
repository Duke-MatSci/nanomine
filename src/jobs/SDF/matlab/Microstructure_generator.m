function [image] = Microstructure_generator(X, type, volfr, pixel)
% pixel - the side length of the image, recommended <= 700
% type - for reconstruction, use 'custom', when choosing 'custom', X is the 1D SDF of the original image
% volfr - volume fraction
% code written by Yichi Zhang, IDEAL Lab, Northwestern University
    
    kmax = pi; % kmax is determined based on the RCWA scattering order
    
    dk = 2*kmax/pixel;
    k = 0:dk:kmax;
    
    switch type
        case 'gauss'
            x = linspace(0,10, pixel/2+1);
            rho = 1/(sqrt(2*pi)*X(2)).*exp(-(x-X(1)).^2/(2*X(2)^2));
        case 'uniform'
            x = linspace(0,1, pixel/2+1);
            rho = double(x>X(1)).*double(x<X(2));
        case 'custom'
            rho = X;
        case 'gamma'
            x = linspace(0,20, pixel/2+1);
            rho = x.^(X(1)-1).*exp(-x/X(2))./ (X(2)^X(1)*gamma(X(1)));
    end
    %rho = [ones(1,pixel/4+1), zeros(1,pixel/4)]/(pixel/4);
   
    P_k = k.*rho; %./((k.^2+k0^2).*(k.^4+2*k.^2*b^2*cos(2*t)+b^4));
%     P_k = k.^2.*1;
    P_k(P_k<0)=0; % take the part above 0 as the pdf curve
    P_k = P_k/sum(P_k)/dk; % normalization to make sure the pdf integral is 1
    f_k = [0,P_k(2:end)./k(2:end)];
    f_k = f_k/sum(f_k)/dk;
    % Sample ki from pdf P_k by uniformly sampling cdf
    N = 1*1e3; % number of ki samples
    CP_k = cumsum(P_k.*dk);
    [CP_k, mask] = unique(CP_k);
    k = k(mask);
    invP_k = fit(CP_k(2:end)',k(2:end)','linearinterp');
    ki = invP_k(rand(N,1));
    % Sample randomly kiV and phi which are indepdent
    ph = 1*pi*rand(N,1);
    kiV = [cos(ph),sin(ph)]; % random vector uniformly distributed on a unit circle, N-by-2 matrix
    clear ph
    phi = 2*pi*rand(N,1); % Angle phi's (uniform on [0, 2pi))
    % Generate GRF based on Cahn's scheme
    [rx,ry] = meshgrid(1:pixel);
    r = [rx(:)';ry(:)']; % 2-by-pixel^2 matrix
    ki = repmat(ki,[1,pixel^2]); % N-by-pixle^2 matrix w/ each column as ki
    phi = repmat(phi,[1,pixel^2]); % N-by-pixle^2 matrix w/ each column as phi
    yr = sqrt(2/N)*sum(cos(ki.*(kiV*r)+phi),1); % 1-by-pixel^2 vector GRF
    clear  phi r ki kiV
    % Construct quasi-random unit cell by level-cut based on volume fraction
    
     % Level-cut parameter alpha determined by volume fraction
%    alpha2 = norminv(0.7,0,1);
    image = zeros(1,pixel^2);
%    image(yr<=alpha2) = 0.5;
    image(yr>=quantile(yr, 1-volfr)) = 1; % 1-by-pixel^2 vector GRF
    image = reshape(image,[pixel,pixel]); % pixel-by-pixle random unit cell for light trapping
end
